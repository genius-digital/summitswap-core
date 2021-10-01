const jsonSummitswapFactory = require('../build/SummitswapFactory.json');
jsonSummitswapFactory.contractName = 'SummitswapFactory';

const contract = require('@truffle/contract');

const SummitswapFactory = contract(jsonSummitswapFactory);

// const { BN } = require('@openzeppelin/test-helpers');
// const ether = (n) => new BN(web3.utils.toWei(n, 'ether'));

module.exports = function (deployer, network) {
  SummitswapFactory.setProvider(this.web3._provider);

  deployer.then(async () => {
    if (network === 'test' || network === 'soliditycoverage') {
      // do nothing
    } else if (network === 'bsctestnet') {
      const b = await deployer.deploy(SummitswapFactory, process.env.RINKEBY_FACTORY_OWNER, { from: process.env.DEPLOYER_ACCOUNT });
      console.log('b:', await b.INIT_CODE_PAIR_HASH.call());
    } else if (network === 'bsc') {
      const b = await deployer.deploy(SummitswapFactory, process.env.MAINNET_FACTORY_OWNER, { from: process.env.DEPLOYER_ACCOUNT });
      console.log('b:', await b.INIT_CODE_PAIR_HASH.call());
    } else {
      console.error(`Unsupported network: ${network}`);
    }
  });
};
